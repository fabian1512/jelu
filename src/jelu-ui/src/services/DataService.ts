import axios, { AxiosError, AxiosHeaders, AxiosInstance } from "axios";
import { UserBook, Book, UserBookBulkUpdate, UserBookUpdate } from "../model/Book";
import { Author } from "../model/Author";
import router from '../router'
import { CreateUser, LoginHistoryInfo, UpdateUser, User, UserAuthentication } from "../model/User";
import { CreateReadingEvent, ReadingEvent, ReadingEventType, ReadingEventWithUserBook } from "../model/ReadingEvent";
import { Tag } from "../model/Tag";
import { Metadata } from "../model/Metadata";
import { Page } from "../model/Page";
import { Quote } from "../model/Quote";
import { ServerSettings } from "../model/ServerSettings";
import { ImportConfigurationDto } from "../model/ImportConfiguration";
import qs from "qs";
import dayjs from "dayjs";
import { LibraryFilter } from "../model/LibraryFilter";
import { WikipediaSearchResult } from "../model/WikipediaSearchResult";
import { WikipediaPageResult } from "../model/WikipediaPageResult";
import { MessageCategory, UpdateUserMessage, UserMessage } from "../model/UserMessage";
import { MonthStats, TotalsStats, YearStats } from "../model/YearStats";
import { Shelf } from "../model/Shelf";
import { CreateReviewDto, Review, UpdateReviewDto, Visibility } from "../model/Review";
import { Role } from "../model/Role";
import { StringUtils } from "../utils/StringUtils";
import { MetadataRequest } from "../model/MetadataRequest";
import { Series, SeriesUpdate } from "../model/Series";
import { DirectoryListing } from "../model/DirectoryListing";
import { BookQuote, CreateBookQuoteDto, UpdateBookQuoteDto } from "../model/BookQuote";
import urls from "../urls";
import { OAuth2ClientDto } from "../model/oauth-client-dto";
import { CustomList, CustomListRemoveDto } from "../model/custom-list";
import { AdminApiToken, ApiToken, ApiTokenCreated, CreateApiToken, TokenScope, UpdateApiToken } from "../model/ApiToken";

class DataService {

  private apiClient: AxiosInstance;

  private token?: string = '';

  private TOKEN_KEY = 'jelu-token'

  private API_BOOK = '/books';

  private API_USERBOOK = '/userbooks';

  private API_USER = '/users';

  private API_HISTORY = '/history';

  private API_AUTHOR = '/authors';

  private API_TAG = '/tags';

  private API_SERIES = '/series';

  private API_LOGOUT = '/logout';

  private API_METADATA = '/metadata';

  private API_QUOTES = '/quotes';

  private API_READING_EVENTS = '/reading-events';

  private API_SERVER_SETTINGS = '/server-settings';

  private API_IMPORTS = '/imports';

  private API_EXPORTS = '/exports';

  private API_WIKIPEDIA = '/wikipedia';

  private API_SEARCH = '/search';

  private API_PAGE = '/page';

  private API_MERGE = '/merge';

  private API_USER_MESSAGES = '/user-messages';

  private API_STATS = '/stats';

  private API_SHELVES = '/shelves';

  private API_REVIEWS = '/reviews';

  private API_BOOK_QUOTES = '/book-quotes';

  private API_CUSTOM_LISTS = '/custom-lists';

  constructor() {
    this.apiClient = axios.create({
      baseURL: urls.API_URL,
      headers: {
        "Content-type": "application/json",
        'X-Requested-With': 'XMLHttpRequest'
      },
      withCredentials: true,
    });

    this.apiClient.interceptors.request.use((config) => {
      const tok = this.getToken()
      if (tok != null) {
        if (!config.headers) {
          config.headers = new AxiosHeaders()
        }
        config.headers["X-Auth-Token"] = tok;
      }
      // Do something before request is sent
      return config;
    }, function (error) {
      // Do something with request error
      return Promise.reject(error);
    });
    this.apiClient.interceptors.response.use(
      originalResponse => {
        return originalResponse;
      },
      error => {
        if (error != null && error.response != null && error.response.status === 401) {
          router.push({ name: 'login' })
        } else {
          throw error
        }
      });
  }

  getToken = (): string | null => {
    if (this.token != null && this.token.trim().length > 0) {
      localStorage.setItem(this.TOKEN_KEY, this.token)
      return this.token
    }
    else if (localStorage.getItem(this.TOKEN_KEY) != null) {
      return localStorage.getItem(this.TOKEN_KEY)
    }
    else {
      return null
    }
  }

  getUserBookById = async (userBookId: string) => {
    try {
      const response = await this.apiClient.get<UserBook>(`${this.API_USERBOOK}/${userBookId}`, {
        transformResponse: this.transformUserbook
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error finding userBook " + userBookId + " " + error)
    }
  }

  getBookAsUserBook = async (bookId: string) => {
    try {
      const response = await this.apiClient.get<UserBook>(`${this.API_USERBOOK}/from-book/${bookId}`, {
        transformResponse: this.transformUserbook
      });
      return response.data;
    }
    catch (error) {
      throw new Error("error finding book as userbook " + bookId + " " + error)
    }
  }

  /*
  * Dates are deserialized as strings, convert to Date instead
  */
  transformUserbook = (data: string) => {
    const tr = JSON.parse(data)
    if (tr.readingEvents != null && tr.readingEvents.length > 0) {
      for (const ev of tr.readingEvents) {
        if (ev.modificationDate != null) {
          ev.modificationDate = dayjs(ev.modificationDate).toDate()
        }
        if (ev.startDate != null) {
          ev.startDate = dayjs(ev.startDate).toDate()
        }
        if (ev.endDate != null) {
          ev.endDate = dayjs(ev.endDate).toDate()
        }
      }
    }
    return tr
  }

  getUser = async () => {
    try {
      const response = await this.apiClient.get<UserAuthentication>(`${this.API_USER}/me`)
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error user " + error)
    }
  }

  getUsers = async () => {
    try {
      const response = await this.apiClient.get<Array<User>>(this.API_USER)
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error users " + error)
    }
  }

  getUserById = async (userId: string) => {
    try {
      const response = await this.apiClient.get<User>(`${this.API_USER}/${userId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get user by id " + error)
    }
  }

  authenticateUser = async (login: string, password: string) => {
    try {
      const response = await this.apiClient.get<UserAuthentication>(`${this.API_USER}/me`, {
        auth: {
          username: login,
          password: password,
        },
      })
      if (response.data.token != null && response.data.token.length > 0) {
        this.token = response.data.token
        localStorage.setItem(this.TOKEN_KEY, this.token)
      }
      return response.data.user

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("login error " + error.response.status + " " + error)
      }
      throw new Error("login error, backend seems down or unreachable")
    }
  }

  fetchToken = async (login?: string, password?: string) => {
    try {
      let response;
      if (login != null && password != null
        && login.trim().length > 0 && password.trim().length > 0) {
        response = await this.apiClient.get('/token', {
          auth: {
            username: login,
            password: password,
          },
        })
      }
      else {
        response = await this.apiClient.get('/token')
      }

      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error auth token " + error)
    }
  }

  deleteUser = async (userId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_USER}/${userId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete user " + error)
    }
  }

  setupStatus = async () => {
    try {
      const response = await this.apiClient.get('/setup/status')
      return response.data.isInitialSetup
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error setup " + error)
    }
  }

  createUser = async (user: CreateUser) => {
    try {
      const resp = await this.apiClient.post<User>(`${this.API_USER}`, user)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("Error ! " + error.response.data.message)
      }
      throw new Error("error create user " + error)
    }
  }

  updateUser = async (userId: string, user: UpdateUser) => {
    try {
      const resp = await this.apiClient.put<User>(`${this.API_USER}/${userId}`, user)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("Error ! " + error.response.data.message)
      }
      throw new Error("error update user " + error)
    }
  }

  createInitialUser = async (login: string, password: string) => {
    try {
      const resp = await this.apiClient.post<User>(`${this.API_USER}`, {
        'login': login,
        'password': password,
        'isAdmin': true
      },
        {
          auth: {
            username: 'setup',
            password: 'initial',
          },
        })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error create user " + error.response.status + " " + error)
      }
      throw new Error("error create user " + error)
    }
  }

  saveBook = async (book: Book) => {
    try {
      const resp = await this.apiClient.post<Book>(this.API_BOOK, book)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error saving book " + error.response.status + " " + error)
      }
      throw new Error("error saving book " + error)
    }
  }

  saveBookImage = async (book: Book, file: File | null, onUploadProgress: any) => {
    try {
      const formData = new FormData()
      if (file != null) {
        formData.append('file', file);
      }
      formData.append('book', new Blob([JSON.stringify(book)], {
        type: "application/json"
      }));
      const resp = await this.apiClient.post<Book>(this.API_BOOK, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: onUploadProgress
        })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error saving book " + error.response.status + " " + error)
      }
      throw new Error("error saving book " + error)
    }
  }

  saveUserBookImage = async (userBook: UserBook, file: File | null, onUploadProgress: any) => {
    try {
      const formData = new FormData()
      if (file != null) {
        formData.append('file', file);
      }
      formData.append('book', new Blob([JSON.stringify(userBook)], {
        type: "application/json"
      }));
      const resp = await this.apiClient.post<UserBook>(this.API_USERBOOK, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: onUploadProgress
        })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error saving book " + error.response.status + " " + error)
      }
      throw new Error("error saving book " + error)
    }
  }

  updateUserBookImage = async (userBook: UserBook, file: File | null, onUploadProgress: any) => {
    try {
      const formData = new FormData()
      if (file != null) {
        formData.append('file', file);
      }
      formData.append('book', new Blob([JSON.stringify(userBook)], {
        type: "application/json"
      }));
      const resp = await this.apiClient.put<UserBook>(`${this.API_USERBOOK}/${userBook.id}`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: onUploadProgress
        })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error updating book " + error.response.status + " " + error)
      }
      throw new Error("error updating book " + error)
    }
  }

  updateUserBook = async (userBook: UserBookUpdate) => {
    try {
      const resp = await this.apiClient.put<UserBook>(`${this.API_USERBOOK}/${userBook.id}`, userBook)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error updating book " + error.response.status + " " + error)
      }
      throw new Error("error updating book " + error)
    }
  }

  findUserBookByCriteria = async (lastEventTypes?: Array<ReadingEventType> | null, bookId?: string|null,
    userId?: string|null, toRead?: boolean | null, owned?: boolean | null, borrowed?: boolean | null,
    page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<UserBook>>(`${this.API_USERBOOK}`, {
        params: {
          lastEventTypes: lastEventTypes,
          bookId: bookId,
          userId: userId,
          toRead: toRead,
          owned: owned,
          borrowed: borrowed,
          page: page,
          size: size,
          sort: sort
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get userBook by eventType " + error)
    }
  }

  findAuthorByCriteria = async (role: Role, query?: string | null, page: number = 0, size: number = 0, sort: string | null = null, libraryFilter?: LibraryFilter) => {
    try {
      const response = await this.apiClient.get<Page<Author>>(`${this.API_AUTHOR}`, {
        params: {
          name: query,
          role: role,
          libraryFilter: libraryFilter,
          page: page,
          size: size,
          sort: sort
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get authors by criteria " + error)
    }
  }

  findTagsByCriteria = async (query?: string | null) => {
    try {
      const response = await this.apiClient.get<Page<Tag>>(`${this.API_TAG}`, {
        params: {
          name: query
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get tags by criteria " + error)
    }
  }

  findSeriesByCriteria = async (query?: string | null) => {
    try {
      const response = await this.apiClient.get<Page<Series>>(`${this.API_SERIES}`, {
        params: {
          name: query
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get series by criteria " + error)
    }
  }


  findPublisherByCriteria = async (query?: string | null) => {
    try {
      const response = await this.apiClient.get<Page<string>>(`${this.API_BOOK}/publishers`, {
        params: {
          name: query
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get publishers by criteria " + error)
    }
  }

  getTagById = async (tagId: string) => {
    try {
      const response = await this.apiClient.get<Tag>(`${this.API_TAG}/${tagId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get tag by id " + error)
    }
  }

  getSeriesById = async (seriesId: string) => {
    try {
      const response = await this.apiClient.get<Series>(`${this.API_SERIES}/${seriesId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get series by id " + error)
    }
  }

  getAuthorById = async (authorId: string) => {
    try {
      const response = await this.apiClient.get<Author>(`${this.API_AUTHOR}/${authorId}`, {
        transformResponse: this.transformAuthor
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get author by id " + error)
    }
  }

  /*
  * Dates are deserialized as strings, convert to Date instead
  */
  transformAuthor = (data: string) => {
    const tr = JSON.parse(data)
    if (tr.dateOfBirth != null) {
      tr.dateOfBirth = dayjs(tr.dateOfBirth).toDate()
    }
    if (tr.dateOfDeath != null) {
      tr.dateOfDeath = dayjs(tr.dateOfDeath).toDate()
    }
    return tr
  }

  getTagBooksById = async (tagId: string,
    page?: number, size?: number, sort?: string, libraryFilter?: LibraryFilter, lastEventTypes?: Array<ReadingEventType> | null) => {
    try {
      const response = await this.apiClient.get<Page<Book>>(`${this.API_TAG}/${tagId}${this.API_BOOK}`, {
        params: {
          page: page,
          size: size,
          sort: sort,
          libraryFilter: libraryFilter,
          lastEventTypes: lastEventTypes,
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get tag books by id " + error)
    }
  }

  getOrphanTags = async (page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<Tag>>(`${this.API_TAG}/orphans`, {
        params: {
          page: page,
          size: size,
          sort: sort,
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get tag orphans " + error)
    }
  }

  getOrphanAuthors = async (page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<Author>>(`${this.API_AUTHOR}/orphans`, {
        params: {
          page: page,
          size: size,
          sort: sort,
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get author orphans " + error)
    }
  }

  getOrphanSeries = async (page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<Series>>(`${this.API_SERIES}/orphans`, {
        params: {
          page: page,
          size: size,
          sort: sort,
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get series orphans " + error)
    }
  }

  getSeriesBooksById = async (seriesId: string,
    page?: number, size?: number, sort?: string, libraryFilter?: LibraryFilter) => {
    try {
      const response = await this.apiClient.get<Page<Book>>(`${this.API_SERIES}/${seriesId}${this.API_BOOK}`, {
        params: {
          page: page,
          size: size,
          sort: sort,
          libraryFilter: libraryFilter
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get series books by id " + error)
    }
  }

  getAuthorBooksById = async (authorId: string,
    page?: number, size?: number, sort?: string, libraryFilter?: LibraryFilter,
    roleFilter?: Role) => {
    try {
      const response = await this.apiClient.get<Page<Book>>(`${this.API_AUTHOR}/${authorId}${this.API_BOOK}`, {
        params: {
          page: page,
          size: size,
          sort: sort,
          libraryFilter: libraryFilter,
          roleFilter: roleFilter
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error get author books by id " + error)
    }
  }

  logout = async () => {
    try {
      await this.apiClient.post(`${this.API_LOGOUT}`, {}, {
        withCredentials: true,
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
    } finally {
      localStorage.removeItem(this.TOKEN_KEY)
      this.token = ''
    }
  }

  fetchMetadata = async (isbn?: string, title?: string, authors?: string) => {
    try {
      const response = await this.apiClient.get<Metadata>(`${this.API_METADATA}`, {
        params: {
          isbn: isbn,
          title: title,
          authors: authors
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error metadata " + error)
    }
  }

  fetchMetadataWithPlugins = async (metadataRequest: MetadataRequest) => {
    try {

      const response = await this.apiClient.post<Metadata>(`${this.API_METADATA}`, metadataRequest)
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error metadata " + error)
    }
  }

  findBooksDetailed = async (title?: string, isbn10?: string, isbn13?: string,
    series?: string, authors?: Array<string>, translators?: Array<string>,
    narrators?: Array<string>,
    tags?: Array<string>, page?: number, size?: number, sort?: string,
    libraryFilter?: LibraryFilter) => {
    try {
      const response = await this.apiClient.get<Page<Book>>(`${this.API_BOOK}`, {
        params: {
          isbn10: isbn10,
          title: title,
          isbn13: isbn13,
          series: series,
          authors: authors,
          translators: translators,
          narrators: narrators,
          tags: tags,
          page: page,
          size: size,
          sort: sort,
          libraryFilter: libraryFilter
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error find books " + error)
    }
  }

  findBooks = async (query?: string, page?: number, size?: number, sort?: string,
    libraryFilter?: LibraryFilter, lastEventTypes?: Array<ReadingEventType> | null,
    toRead?: boolean | null, owned?: boolean | null, borrowed?: boolean | null,) => {
    try {
      const response = await this.apiClient.get<Page<Book>>(`${this.API_BOOK}`, {
        params: {
          q: query,
          page: page,
          size: size,
          sort: sort,
          libraryFilter: libraryFilter,
          lastEventTypes: lastEventTypes,
          toRead: toRead,
          owned: owned,
          borrowed: borrowed,
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error find books " + error)
    }
  }

  deleteUserBook = async (userbookId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_USERBOOK}/${userbookId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete userbook " + error)
    }
  }

  deleteBook = async (bookId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_BOOK}/${bookId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete book " + error)
    }
  }

  deleteReadingEvent = async (eventId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_READING_EVENTS}/${eventId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete event " + error)
    }
  }

  deleteAuthor = async (authorId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_AUTHOR}/${authorId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete author " + error)
    }
  }

  deleteSeries = async (seriesId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_SERIES}/${seriesId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete series " + error)
    }
  }

  deleteTag = async (tagId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_TAG}/${tagId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete tag " + error)
    }
  }

  quotes = async (query?: string) => {
    try {
      const response = await this.apiClient.get<Array<Quote>>(`${this.API_QUOTES}`, {
        params: {
          query: query,
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error quotes " + error)
    }
  }

  randomQuotes = async () => {
    try {
      const response = await this.apiClient.get<Array<Quote>>(`${this.API_QUOTES}/random`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error random quotes " + error)
    }
  }

  userLoginHistory = async () => {
    try {
      const response = await this.apiClient.get<Array<LoginHistoryInfo>>(`${this.API_USER}${this.API_HISTORY}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error history info " + error)
    }
  }

  /*
  * Dates are deserialized as strings, convert to Date instead
  */
  transformReadingEvents = (data: string) => {
    const page = JSON.parse(data)
    if (page.content) {
      for (const ev of page.content) {
        if (ev.modificationDate != null) {
          ev.modificationDate = dayjs(ev.modificationDate).toDate()
        }
        if (ev.startDate != null) {
          ev.startDate = dayjs(ev.startDate).toDate()
        }
        if (ev.endDate != null) {
          ev.endDate = dayjs(ev.endDate).toDate()
        }
      }
    }
    return page
  }

  myReadingEvents = async (eventTypes?: Array<ReadingEventType> | null, bookId?: string,
    startedAfter?: string, startedBefore?: string,
    endedAfter?: string, endedBefore?: string,
    page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<ReadingEventWithUserBook>>(`${this.API_READING_EVENTS}/me`, {
        params: {
          eventTypes: eventTypes,
          bookId: bookId,
          startedAfter: startedAfter,
          startedBefore: startedBefore,
          endedAfter: endedAfter,
          endedBefore: endedBefore,
          page: page,
          size: size,
          sort: sort
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
        transformResponse: this.transformReadingEvents
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error my events " + error)
    }
  }

  findReadingEvents = async (eventTypes?: Array<ReadingEventType> | null, userId?: string, bookId?: string,
    startedAfter?: string, startedBefore?: string,
    endedAfter?: string, endedBefore?: string,
    page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<ReadingEventWithUserBook>>(`${this.API_READING_EVENTS}`, {
        params: {
          eventTypes: eventTypes,
          userId: userId,
          bookId: bookId,
          startedAfter: startedAfter,
          startedBefore: startedBefore,
          endedAfter: endedAfter,
          endedBefore: endedBefore,
          page: page,
          size: size,
          sort: sort
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
        transformResponse: this.transformReadingEvents
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error events " + error)
    }
  }

  serverSettings = async () => {
    try {
      const response = await this.apiClient.get<ServerSettings>(`${this.API_SERVER_SETTINGS}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error server settings " + error)
    }
  }

  importCsv = async (importConfig: ImportConfigurationDto, file: File, onUploadProgress: any) => {
    try {
      const formData = new FormData()
      formData.append('file', file);
      formData.append('importConfig', new Blob([JSON.stringify(importConfig)], {
        type: "application/json"
      }));
      await this.apiClient.post(this.API_IMPORTS, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: onUploadProgress
        })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error import csv " + error.response.status + " " + error)
      }
      throw new Error("error importing csv " + error)
    }
  }

  exportCsv = async () => {
    try {
      await this.apiClient.post(this.API_EXPORTS)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error export csv " + error.response.status + " " + error)
      }
      throw new Error("error exporting csv request" + error)
    }
  }

  updateReadingEvent = async (event: ReadingEvent) => {
    try {
      const resp = await this.apiClient.put<ReadingEvent>(`${this.API_READING_EVENTS}/${event.id}`, {
        eventType: event.eventType,
        eventDate: event.endDate,
        startDate: event.startDate
      })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error updating event " + error.response.status + " " + error)
      }
      throw new Error("error updating event " + error)
    }
  }

  createReadingEvent = async (event: CreateReadingEvent) => {
    try {
      const resp = await this.apiClient.post<ReadingEvent>(`${this.API_READING_EVENTS}`, event)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error creating event " + error.response.status + " " + error)
      }
      throw new Error("error creating event " + error)
    }
  }

  wikipediaSearch = async (query: string, language: string) => {
    try {
      const response = await this.apiClient.get<WikipediaSearchResult>(`${this.API_WIKIPEDIA}${this.API_SEARCH}`, {
        params: {
          query: query,
          language: language
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error wikipedia search " + error)
    }
  }

  wikipediaPage = async (pageTitle: string, language: string) => {
    try {
      const response = await this.apiClient.get<WikipediaPageResult>(`${this.API_WIKIPEDIA}${this.API_PAGE}`, {
        params: {
          pageTitle: pageTitle,
          language: language
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error wikipedia page " + error)
    }
  }

  updateAuthor = async (author: Author, file: File | null, onUploadProgress: any) => {
    try {
      const formData = new FormData()
      if (file != null) {
        formData.append('file', file);
      }
      formData.append('author', new Blob([JSON.stringify(author)], {
        type: "application/json"
      }));
      const resp = await this.apiClient.put<Author>(`${this.API_AUTHOR}/${author.id}`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: onUploadProgress
        })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error updating book " + error.response.status + " " + error)
      }
      throw new Error("error updating book " + error)
    }
  }

  mergeAuthors = async (authorId: string, otherId: string, authorDto: Author) => {
    try {
      const resp = await this.apiClient.put<Author>(`${this.API_AUTHOR}/${authorId}${this.API_MERGE}/${otherId}`, authorDto)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error merging authors " + error.response.status + " " + error)
      }
      throw new Error("error merging authors " + error)
    }
  }

  /*
  * Dates are deserialized as strings, convert to Date instead
  */
  transformUserMessage = (data: string) => {
    const ev = JSON.parse(data)
    if (ev.modificationDate != null) {
      ev.modificationDate = dayjs(ev.modificationDate).toDate()
    }
    return ev
  }

  messages = async (messageCategories?: Array<MessageCategory> | null, read?: boolean,
    page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<UserMessage>>(`${this.API_USER_MESSAGES}`, {
        params: {
          messageCategories: messageCategories,
          read: read,
          page: page,
          size: size,
          sort: sort
        },
        paramsSerializer: {
          serialize : (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' })
        }},
        transformResponse: this.transformUserMessage
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error userMessages " + error)
    }
  }

  updateUserMessage = async (messageId: string, updateDto: UpdateUserMessage) => {
    try {
      const response = await this.apiClient.put<UserMessage>(`${this.API_USER_MESSAGES}/${messageId}`, updateDto);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error update userMessage " + error)
    }
  }

  fetchMetadataProviders = async () => {
    try {
      const response = await this.apiClient.get<Array<any>>(`/metadata-providers`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error fetching metadata providers " + error)
    }
  }

  saveMetadataProviders = async (providers: Array<any>) => {
    try {
      await this.apiClient.put(`/metadata-providers`, { providers });
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error saving metadata providers " + error)
    }
  }

  yearStats = async () => {
    try {
      const response = await this.apiClient.get<Array<YearStats>>(`${this.API_STATS}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error stats " + error)
    }
  }

  monthStatsForYear = async (year: number) => {
    try {
      const response = await this.apiClient.get<Array<MonthStats>>(`${this.API_STATS}/${year}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error stats months " + error)
    }
  }

  yearsWithStats = async () => {
    try {
      const response = await this.apiClient.get<Array<number>>(`${this.API_STATS}/years`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error stats years " + error)
    }
  }

  totalsStats = async () => {
    try {
      const response = await this.apiClient.get<TotalsStats>(`${this.API_STATS}/total`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error stats total " + error)
    }
  }

  shelves = async (name?: string, targetId?: string, page?: number, size?: number, sort?: string) => {
    try {
      const response = await this.apiClient.get<Page<Shelf>>(`${this.API_SHELVES}`, {
        params: {
          name: name,
          targetId: targetId,
          page: page,
          size: size,
          sort: sort,
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error shelves " + error)
    }
  }

  deleteShelf = async (shelfId?: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_SHELVES}/${shelfId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete shelves " + error)
    }
  }

  saveShelf = async (shelf: Shelf) => {
    try {
      const resp = await this.apiClient.post<Shelf>(`${this.API_SHELVES}`, shelf)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error creating shelf " + error.response.status + " " + error)
      }
      throw new Error("error creating event " + error)
    }
  }

  bulkEditUserBooks = async (bulkUpdateDto: UserBookBulkUpdate) => {
    try {
      const resp = await this.apiClient.put<number>(this.API_USERBOOK, {
        ids: bulkUpdateDto.ids,
        addTags: bulkUpdateDto.addTags,
        removeTags: bulkUpdateDto.removeTags,
        owned: bulkUpdateDto.owned,
        toRead: bulkUpdateDto.toRead,
      })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error bulk updating " + error.response.status + " " + error)
      }
      throw new Error("error bulk updating " + error)
    }
  }

  saveReview = async (review: CreateReviewDto) => {
    try {
      const resp = await this.apiClient.post<Review>(`${this.API_REVIEWS}`, review)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error creating review " + error.response.status + " " + error)
      }
      throw new Error("error creating review " + error)
    }
  }

  /*
  * Dates are deserialized as strings, convert to Date instead
  */
  transformReviews = (data: string) => {
    const page = JSON.parse(data)
    if (page.content) {
      for (const ev of page.content) {
        if (ev.modificationDate != null) {
          ev.modificationDate = dayjs(ev.modificationDate).toDate()
        }
        if (ev.creationDate != null) {
          ev.creationDate = dayjs(ev.creationDate).toDate()
        }
        if (ev.reviewDate != null) {
          ev.reviewDate = dayjs(ev.reviewDate).toDate()
        }
      }
    }
    return page
  }

  transformReview = (data: string) => {
    const ev = JSON.parse(data)
    if (ev.modificationDate != null) {
      ev.modificationDate = dayjs(ev.modificationDate).toDate()
    }
    if (ev.creationDate != null) {
      ev.creationDate = dayjs(ev.creationDate).toDate()
    }
    if (ev.reviewDate != null) {
      ev.reviewDate = dayjs(ev.reviewDate).toDate()
    }
    return ev
  }

  findReviews = async (userId?: string, bookId?: string, visibility: Visibility | null = null,
    after: string | null = null, before: string | null = null,
    page?: number, size?: number, sort: string | null = null) => {
    try {
      const response = await this.apiClient.get<Page<Review>>(`${this.API_REVIEWS}`, {
        params: {
          userId: userId,
          bookId: bookId,
          visibility: visibility,
          after: after,
          before: before,
          page: page,
          size: size,
          sort: sort
        },
        transformResponse: this.transformReviews
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error reviews " + error)
    }
  }

  findReviewById = async (reviewId: string) => {
    try {
      const response = await this.apiClient.get<Review>(`${this.API_REVIEWS}/${reviewId}`, {
        transformResponse: this.transformReview
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error review " + error)
    }
  }

  deleteReview = async (reviewId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_REVIEWS}/${reviewId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete review " + error)
    }
  }

  updateReview = async (reviewId: string, updateDto: UpdateReviewDto) => {
    try {
      const response = await this.apiClient.put<Review>(`${this.API_REVIEWS}/${reviewId}`, updateDto);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error update review " + error)
    }
  }

  updateSeries = async (seriesId: string, updateDto: SeriesUpdate) => {
    try {
      const response = await this.apiClient.put<Series>(`${this.API_SERIES}/${seriesId}`, updateDto);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error update series " + error)
    }
  }

  updateBook = async (bookId: string, bookUpdateDto: Book) => {
    try {
      const response = await this.apiClient.put<Book>(`${this.API_BOOK}/${bookId}`, bookUpdateDto);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error update book " + error)
    }
  }

  findBookById = async (bookId: string) => {
    try {
      const response = await this.apiClient.get<Book>(`${this.API_BOOK}/${bookId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error book by id " + error)
    }
  }

  usernameById = async (userId: string) => {
    try {
      const response = await this.apiClient.get(`/username/${userId}`);
      return response.data.username;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error username by id " + error)
    }
  }

  checkIsbnExists = async (isbn10: string|undefined, isbn13: string|undefined) => {
    if (StringUtils.isNotBlank(isbn10)) {
      const res = await this.findBooks(`isbn:${isbn10}`)
      if (!res.empty) {
        return res.content[0]
      }
    }
    if (StringUtils.isNotBlank(isbn13)) {
      const res = await this.findBooks(`isbn:${isbn13}`)
      if (!res.empty) {
        return res.content[0]
      }
    }
    return null
  }

  getDirectoryListing = async (path: string, reason = "metadata") => {
    try {
      const response = await this.apiClient.post<DirectoryListing>('/filesystem', {'reason' : reason, 'path' : path});
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error directory " + path + " " + error)
    }
  }

  getMetadataFromUploadedFile = async (file: File | null, onUploadProgress: any) => {
    try {
      const formData = new FormData()
      if (file != null) {
        formData.append('file', file);
      }
      const resp = await this.apiClient.post<Metadata>(`${this.API_METADATA}/file`, formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          },
          onUploadProgress: onUploadProgress
        })
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error uploading file " + error.response.status + " " + error)
      }
      throw new Error("error uploading file " + error)
    }
  }

  getMetadataFromFile = async (filePath: string) => {
    try {
      const response = await this.apiClient.get<Metadata>(`${this.API_METADATA}/file`, {
        params: {
          filepath: filePath,
        }
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error metadata from path " + error)
    }
  }

  saveBookQuote = async (quote: CreateBookQuoteDto) => {
    try {
      const resp = await this.apiClient.post<BookQuote>(`${this.API_BOOK_QUOTES}`, quote)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error creating book quote " + error.response.status + " " + error)
      }
      throw new Error("error creating book quote " + error)
    }
  }

  /*
  * Dates are deserialized as strings, convert to Date instead
  */
  transformBookQuotes = (data: string) => {
    const page = JSON.parse(data)
    if (page.content) {
      for (const ev of page.content) {
        if (ev.modificationDate != null) {
          ev.modificationDate = dayjs(ev.modificationDate).toDate()
        }
        if (ev.creationDate != null) {
          ev.creationDate = dayjs(ev.creationDate).toDate()
        }
      }
    }
    return page
  }

  transformBookQuote = (data: string) => {
    const ev = JSON.parse(data)
    if (ev.modificationDate != null) {
      ev.modificationDate = dayjs(ev.modificationDate).toDate()
    }
    if (ev.creationDate != null) {
      ev.creationDate = dayjs(ev.creationDate).toDate()
    }
    return ev
  }

  findBookQuotes = async (userId?: string, bookId?: string, visibility: Visibility | null = null,
    page?: number, size?: number, sort: string | null = null) => {
    try {
      const response = await this.apiClient.get<Page<BookQuote>>(`${this.API_BOOK_QUOTES}`, {
        params: {
          userId: userId,
          bookId: bookId,
          visibility: visibility,
          page: page,
          size: size,
          sort: sort
        },
        transformResponse: this.transformBookQuotes
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error book quotes " + error)
    }
  }

  findBookQuoteById = async (quoteId: string) => {
    try {
      const response = await this.apiClient.get<BookQuote>(`${this.API_BOOK_QUOTES}/${quoteId}`, {
        transformResponse: this.transformBookQuote
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error book quote " + error)
    }
  }

  deleteBookQuote = async (quoteId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_BOOK_QUOTES}/${quoteId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete quote " + error)
    }
  }

  updateBookQuote = async (quoteId: string, updateDto: UpdateBookQuoteDto) => {
    try {
      const response = await this.apiClient.put<BookQuote>(`${this.API_BOOK_QUOTES}/${quoteId}`, updateDto);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error update quote " + error)
    }
  }

  oauth2Providers = async () => {
    try {
      const response = await this.apiClient.get<Array<OAuth2ClientDto>>("/oauth2/providers");
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error oauth providers " + error)
    }
  }

  saveCustomList = async (list: CustomList) => {
    try {
      const resp = await this.apiClient.post<CustomList>(`${this.API_CUSTOM_LISTS}`, list)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error creating custom list " + error.response.status + " " + error)
      }
      throw new Error("error creating custom list " + error)
    }
  }

  findCustomLists = async (name?: string,
    page?: number, size?: number, sort: string | null = null) => {
    try {
      const response = await this.apiClient.get<Page<CustomList>>(`${this.API_CUSTOM_LISTS}`, {
        params: {
          name: name,
          page: page,
          size: size,
          sort: sort
        },
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error custom lists " + error)
    }
  }

  findCustomListById = async (listId: string) => {
    try {
      const response = await this.apiClient.get<CustomList>(`${this.API_CUSTOM_LISTS}/${listId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error custom list " + error)
    }
  }

  deleteCustomList = async (listId: string) => {
    try {
      const response = await this.apiClient.delete(`${this.API_CUSTOM_LISTS}/${listId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete list " + error)
    }
  }

  booksForList = async (listId: string, page?: number, size?: number, sort: string | null = null) => {
    try {
      const response = await this.apiClient.get<Page<Book>>(`${this.API_CUSTOM_LISTS}/${listId}/books`, {
        params: {
          page: page,
          size: size,
          sort: sort
        },
      });
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error custom list books " + error)
    }
  }

  removeBooksFromList = async (customListRemoveDto: CustomListRemoveDto) => {
    try {
      const resp = await this.apiClient.post(`${this.API_CUSTOM_LISTS}/remove`, customListRemoveDto)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("error remove from list " + error.response.status + " " + error)
      }
      throw new Error("error remove from list " + error)
    }
  }

  /*
   * API Token methods
   */
  getApiTokens = async () => {
    try {
      const response = await this.apiClient.get<Array<ApiToken>>('/api-tokens');
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error api tokens " + error)
    }
  }

  createApiToken = async (token: CreateApiToken) => {
    try {
      const resp = await this.apiClient.post<ApiTokenCreated>('/api-tokens', token)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("Error ! " + error.response.data.message)
      }
      throw new Error("error create api token " + error)
    }
  }

  updateApiToken = async (tokenId: string, token: UpdateApiToken) => {
    try {
      const resp = await this.apiClient.put<ApiToken>(`/api-tokens/${tokenId}`, token)
      return resp.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error("Error ! " + error.response.data.message)
      }
      throw new Error("error update api token " + error)
    }
  }

  deleteApiToken = async (tokenId: string) => {
    try {
      const response = await this.apiClient.delete(`/api-tokens/${tokenId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error delete api token " + error)
    }
  }

  getApiTokenScopes = async () => {
    try {
      const response = await this.apiClient.get<Array<TokenScope>>('/api-tokens/scopes');
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error api token scopes " + error)
    }
  }

  /*
   * Currently these admin calls are not ever leveraged by the frontend. However, I'm leaving
   * them here for posterity to allow for an admin interface to potentially be created that
   * would allow admins control over all API tokens (not just user specific ones) for their
   * administered Jelu instance.
   */
  getAdminApiTokens = async () => {
    try {
      const response = await this.apiClient.get<Array<AdminApiToken>>('/admin/api-tokens');
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error admin api tokens " + error)
    }
  }

  adminDeleteApiToken = async (tokenId: string) => {
    try {
      const response = await this.apiClient.delete(`/admin/api-tokens/${tokenId}`);
      return response.data;
    }
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
      }
      throw new Error("error admin delete api token " + error)
    }
  }

}

export default new DataService()
